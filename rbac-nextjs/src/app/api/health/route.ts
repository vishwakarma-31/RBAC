export async function GET() {
  return new Response(JSON.stringify({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'RBAC Configuration Tool API is running'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}