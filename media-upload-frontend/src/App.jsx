import FileUpload from './FileUpload';
import './App.css';

function App() {
  return (
    <main style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <h1>Cloud Media Pipeline</h1>
      <p>Direct-to-S3 Upload Interface</p>
      
      {/* Step 3 Component */}
      <FileUpload />
    </main>
  );
}

export default App;