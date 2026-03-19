// =================================
// TYPES CLOUDINARY (Service de stockage)
// =================================

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface CloudinaryTransformation {
  quality?: string | number;
  fetch_format?: string;
  gravity?: string;
  crop?: string;
  width?: number;
  height?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformations?: CloudinaryTransformation[];
}

export interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  [key: string]: unknown;
}

export interface CloudinaryUploadResponse extends CloudinaryResource {
  [key: string]: unknown;
}

export interface CloudinaryDeleteResponse {
  result: string;
  [key: string]: unknown;
}

export interface CloudinaryResourcesResponse {
  resources: CloudinaryResource[];
  [key: string]: unknown;
}

export interface CloudinaryUsageResponse {
  credits?: {
    usage: number;
  };
  objects?: {
    usage: number;
  };
  bandwidth?: {
    usage: number;
  };
  storage?: {
    usage: number;
  };
  [key: string]: unknown;
}

export interface CloudinaryStats {
  credits?: number;
  objects?: number;
  bandwidth?: number;
  storage?: number;
}
