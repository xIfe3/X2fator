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
   * Lists data bundle options for a network, sourced from Flutterwave's
   * live bill-categories list so bundle sizes/prices always match what
   * Flutterwave can actually fulfil.
   */
  async listDataBundles(
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile',
  ): Promise<FlutterwaveBillCategory[]> {
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
        body.message ?? 'Could not fetch data bundle options',
      );
    }

    const billerName = NETWORK_BILLER_NAMES[provider];

    return body.data.filter(
      (category) =>
        !category.is_airtime &&
        category.biller_name.toLowerCase().includes(billerName.toLowerCase()),
    );
  }

  /**
   * Pays an airtime top-up bill through Flutterwave.
   */
  async payAirtime(params: {
    provider: 'mtn' | 'airtel' | 'glo' | '9mobile';
    phoneNumber: string;
    amount: string;
    reference: string;
  }): Promise<{ providerReference: string; message: string }> {
    return this.payBill({
      itemCode: 'AIRTIME',
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
