import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FlutterwaveBillCategory {
  biller_code: string;
  item_code: string;
  name: string;
  biller_name: string;
  amount: number | null;
  is_airtime: boolean;
}

const NETWORK_BILLER_NAMES: Record<
  'mtn' | 'airtel' | 'glo' | '9mobile',
  string
> = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
};

@Injectable()
export class FlutterwaveBillsService {
  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string | undefined {
    return this.configService.get<string>('flutterwave.secretKey');
  }

  private get baseUrl(): string | undefined {
    return this.configService.get<string>('flutterwave.baseUrl');
  }

  private assertConfigured(): { secretKey: string; baseUrl: string } {
    const secretKey = this.secretKey;
    const baseUrl = this.baseUrl;
    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }
    return { secretKey, baseUrl };
  }

  /**
   * Fetches Flutterwave's live bill-categories list for a network,
   * split into data-bundle and airtime categories. Both purchase flows
   * source their `item_code` from here — Flutterwave's `/bills`
   * endpoint rejects anything that isn't a real category code from this
   * list, so neither flow can use a made-up literal.
   */
  private async listBillCategories(
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile',
  ): Promise<{
    dataBundles: FlutterwaveBillCategory[];
    airtime: FlutterwaveBillCategory[];
  }> {
    const { secretKey, baseUrl } = this.assertConfigured();

    const response = await fetch(`${baseUrl}/bill-categories?country=NG`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: FlutterwaveBillCategory[];
    };

    if (!response.ok || body.status !== 'success' || !body.data) {
      throw new BadRequestException(
        body.message ?? 'Could not fetch bill categories',
      );
    }

    const billerName = NETWORK_BILLER_NAMES[provider];
    const forNetwork = body.data.filter((category) =>
      category.biller_name.toLowerCase().includes(billerName.toLowerCase()),
    );

    return {
      dataBundles: forNetwork.filter((category) => !category.is_airtime),
      airtime: forNetwork.filter((category) => category.is_airtime),
    };
  }

  /**
   * Lists data bundle options for a network, sourced from Flutterwave's
   * live bill-categories list so bundle sizes/prices always match what
   * Flutterwave can actually fulfil.
   */
  async listDataBundles(
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile',
  ): Promise<FlutterwaveBillCategory[]> {
    const { dataBundles } = await this.listBillCategories(provider);
    return dataBundles;
  }

  /**
   * Pays an airtime top-up bill through Flutterwave. The biller's real
   * airtime item_code is looked up fresh from bill-categories rather
   * than hardcoded — a literal like "AIRTIME" is not a category
   * Flutterwave recognizes, so sending it fails every airtime purchase.
   */
  async payAirtime(params: {
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
    phoneNumber: string;
    amount: string;
    reference: string;
  }): Promise<{ providerReference: string; message: string }> {
    const { airtime } = await this.listBillCategories(params.provider);
    const category = airtime[0];

    if (!category) {
      throw new BadRequestException(
        `Airtime top-up is not available for ${NETWORK_BILLER_NAMES[params.provider]} right now`,
      );
    }

    return this.payBill({
      itemCode: category.item_code,
      billerName: NETWORK_BILLER_NAMES[params.provider],
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      reference: params.reference,
    });
  }

  /**
   * Pays a data bundle bill through Flutterwave. `itemCode` must be one
   * of the `item_code` values returned by listDataBundles() for this
   * network.
   */
  async payDataBundle(params: {
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
    phoneNumber: string;
    amount: string;
    itemCode: string;
    reference: string;
  }): Promise<{ providerReference: string; message: string }> {
    return this.payBill({
      itemCode: params.itemCode,
      billerName: NETWORK_BILLER_NAMES[params.provider],
      phoneNumber: params.phoneNumber,
      amount: params.amount,
      reference: params.reference,
    });
  }

  private async payBill(params: {
    itemCode: string;
    billerName: string;
    phoneNumber: string;
    amount: string;
    reference: string;
  }): Promise<{ providerReference: string; message: string }> {
    const { secretKey, baseUrl } = this.assertConfigured();

    const response = await fetch(`${baseUrl}/bills`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: 'NG',
        customer: params.phoneNumber,
        amount: Number(params.amount),
        recurrence: 'ONCE',
        type: params.itemCode,
        biller_name: params.billerName,
        reference: params.reference,
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { reference?: string; tx_ref?: string };
    };

    if (!response.ok || body.status !== 'success') {
      throw new BadRequestException(body.message ?? 'Bill payment failed');
    }

    return {
      providerReference: body.data?.reference ?? params.reference,
      message: body.message ?? 'Bill payment successful',
    };
  }
}
