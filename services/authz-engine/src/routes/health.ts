// Health check route

export function handleHealth(req: any, res: any) {
  const data = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'authz-engine'
  };
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}