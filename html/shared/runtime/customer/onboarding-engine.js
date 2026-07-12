
// TSM Customer Onboarding Engine

const onboardingEngine = {
  start(customer){
    return {
      status:"ONBOARDING_STARTED",
      customer,
      steps:[
        "tenant_creation",
        "security_configuration",
        "solution_assignment",
        "integration_setup",
        "runtime_activation"
      ]
    };
  }
};

module.exports = onboardingEngine;
if (typeof window !== 'undefined') { window.TSMCustomerOnboardingEngine = onboardingEngine; }
