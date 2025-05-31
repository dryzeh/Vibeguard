export interface AppConfig {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
  welcomeMessage: string;
  supportEmail: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
} 