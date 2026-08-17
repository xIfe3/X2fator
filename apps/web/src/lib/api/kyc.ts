import { api } from "../api-client";
import type { KycDocument, KycDocumentType, KycStatus } from "../types";

export const kycApi = {
  submit: (dto: { documentType: KycDocumentType; documentNumber?: string; documentUrl: string }) =>
    api.post<KycDocument>("/kyc/documents", dto),
  status: () => api.get<KycStatus>("/kyc/status"),
  myDocuments: () => api.get<KycDocument[]>("/kyc/documents"),
};
