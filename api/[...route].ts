export default async function handler(request: any, response: any) {
  const { default: app } = await import("../backend/src/app.js");
  return app(request, response);
}
