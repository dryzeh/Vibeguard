interface Translation {
  [key: string]: {
    en: string;
    sv: string;
  };
}

export const translations: Translation = {
  welcomeBack: {
    en: 'Welcome Back!',
    sv: 'Välkommen Tillbaka!'
  },
  loginToDashboard: {
    en: 'Log in to your business dashboard',
    sv: 'Logga in på din företagspanel'
  },
  businessEmail: {
    en: 'Business Email',
    sv: 'Företagsmail'
  },
  enterBusinessEmail: {
    en: 'Enter your business email',
    sv: 'Ange din företagsmail'
  },
  password: {
    en: 'Password',
    sv: 'Lösenord'
  },
  enterPassword: {
    en: 'Enter your password',
    sv: 'Ange ditt lösenord'
  },
  forgotPassword: {
    en: 'Forgot Password?',
    sv: 'Glömt Lösenord?'
  },
  loginButton: {
    en: 'Login to Dashboard',
    sv: 'Logga in på panelen'
  },
  newToVibeGuard: {
    en: 'New to VibeGuard? Create Business Account',
    sv: 'Ny på VibeGuard? Skapa Företagskonto'
  },
  missingInfo: {
    en: 'Missing Information',
    sv: 'Information Saknas'
  },
  enterEmailAndPassword: {
    en: 'Please enter both your email and password.',
    sv: 'Vänligen ange både e-post och lösenord.'
  },
  loginFailed: {
    en: 'Login Failed',
    sv: 'Inloggningen Misslyckades'
  },
  checkCredentials: {
    en: 'Please check your credentials and try again.',
    sv: 'Kontrollera dina uppgifter och försök igen.'
  },
  resetPassword: {
    en: 'Reset Password',
    sv: 'Återställ Lösenord'
  },
  contactSupport: {
    en: 'Please contact support to reset your password.',
    sv: 'Kontakta support för att återställa ditt lösenord.'
  },
  ok: {
    en: 'OK',
    sv: 'OK'
  },
  websiteError: {
    en: 'Error',
    sv: 'Fel'
  },
  websiteErrorMessage: {
    en: 'Unable to open the website. Please visit vibeguard.se manually.',
    sv: 'Kunde inte öppna webbplatsen. Besök vibeguard.se manuellt.'
  },
  showPassword: {
    en: 'Show password',
    sv: 'Visa lösenord'
  },
  hidePassword: {
    en: 'Hide password',
    sv: 'Dölj lösenord'
  }
}; 