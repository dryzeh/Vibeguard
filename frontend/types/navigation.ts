export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  SecurityDashboard: undefined;
  FloorMap: undefined;
  VerifyEmail: { email: string };
  ForgotPassword: undefined;
  AdminLogin: undefined;
  AdminPanel: undefined;
  ResetPassword: { token: string };
}; 