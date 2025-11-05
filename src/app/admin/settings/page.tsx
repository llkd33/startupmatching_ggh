export const dynamic = 'force-dynamic'

export default function AdminSettings() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Settings</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Platform Settings</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Create Admin User</h3>
            <p className="text-sm text-gray-600 mb-3">
              To create a new admin user, run the following command in your terminal:
            </p>
            <code className="block bg-gray-100 p-3 rounded text-sm">
              npm run create-admin &lt;email&gt; &lt;password&gt;
            </code>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Database Management</h3>
            <p className="text-sm text-gray-600">
              Database migrations and configurations can be managed through Supabase dashboard.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-700 mb-2">Audit Logs</h3>
            <p className="text-sm text-gray-600">
              Admin actions are logged in the admin_audit_logs table for compliance and security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}