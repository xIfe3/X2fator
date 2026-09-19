import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FlutterwaveBank {
  code: string;
  name: string;
}

@Injectable()
export class FlutterwaveAccountsService {
  constructor(private readonly configService: ConfigService) {}

  private get secretKey(): string | undefined {
    return this.configService.get<string>('flutterwave.secretKey');
  }

  private get baseUrl(): string | undefined {
    return this.configService.get<string>('flutterwave.baseUrl');
  }

  async listBanks(): Promise<FlutterwaveBank[]> {
    const secretKey = this.secretKey;
    const baseUrl = this.baseUrl;

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const response = await fetch(`${baseUrl}/banks/NG`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { id: number; code: string; name: string }[];
    };

    if (!response.ok || body.status !== 'success' || !body.data) {
      throw new BadRequestException(
        body.message ?? 'Could not fetch bank list',
      );
    }

    return body.data.map((bank) => ({ code: bank.code, name: bank.name }));
  }

  async resolveAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string }> {
    const secretKey = this.secretKey;
    const baseUrl = this.baseUrl;

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const response = await fetch(`${baseUrl}/accounts/resolve`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: accountNumber,
        account_bank: bankCode,
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { account_number: string; account_name: string };
    };

    if (!response.ok || body.status !== 'success' || !body.data?.account_name) {
      throw new BadRequestException(
        'Beneficiary account not found. Recheck account information.',
      );
    }

    return { accountName: body.data.account_name };
  }

  /**
   * Initiates a bank payout via Flutterwave's Transfer API. This only
   * *starts* the transfer — Flutterwave processes it asynchronously and
   * reports the final outcome via the `transfer.completed` webhook, so a
   * successful response here means "accepted for processing", not
   * "money has moved".
   */
  async initiateTransfer(params: {
    reference: string;
    accountNumber: string;
    bankCode: string;
    amount: number;
    narration: string;
  }): Promise<{ transferId: string }> {
    const secretKey = this.secretKey;
    const baseUrl = this.baseUrl;

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const response = await fetch(`${baseUrl}/transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: params.bankCode,
        account_number: params.accountNumber,
        amount: params.amount,
        narration: params.narration,
        currency: 'NGN',
        reference: params.reference,
      }),
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { id: number; status?: string };
    };

    if (!response.ok || body.status !== 'success' || !body.data?.id) {
      throw new BadRequestException(
        body.message ?? 'Could not initiate withdrawal transfer',
      );
    }

    return { transferId: String(body.data.id) };
  }

  /**
   * Fetches a transfer's current status directly from Flutterwave — used
   * to reconcile a withdrawal if its webhook is ever missed or delayed.
   */
  async getTransferStatus(
    transferId: string,
  ): Promise<{ status: string; reference?: string }> {
    const secretKey = this.secretKey;
    const baseUrl = this.baseUrl;

    if (!secretKey || !baseUrl) {
      throw new BadRequestException('Flutterwave is not configured');
    }

    const response = await fetch(`${baseUrl}/transfers/${transferId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const body = (await response.json()) as {
      status?: string;
      message?: string;
      data?: { status?: string; reference?: string };
    };

    if (!response.ok || body.status !== 'success' || !body.data) {
      throw new BadRequestException(
        body.message ?? 'Could not fetch transfer status',
      );
    }

    return {
      status: body.data.status ?? 'unknown',
      reference: body.data.reference,
    };
  }
}
