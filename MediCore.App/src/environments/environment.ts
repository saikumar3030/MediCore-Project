export const environment = {
  production: false,
  // Monolithic MediCore.Api backend. Property name kept as `apiGatewayUrl` so existing
  // Angular services keep compiling without churn — but it now points at the single API
  // instead of the Ocelot gateway.
  apiGatewayUrl: 'http://localhost:5000'
};
