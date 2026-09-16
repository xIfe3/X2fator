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
        body.message ?? 'Could not verify this account number',
      );
    }

    return { accountName: body.data.account_name };
  }
}
