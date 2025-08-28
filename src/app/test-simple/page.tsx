export default function TestPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>Simple Test Page</h1>
      <p>If you can see this, React is working.</p>
      <p>Current time: {new Date().toISOString()}</p>
    </div>
  )
}