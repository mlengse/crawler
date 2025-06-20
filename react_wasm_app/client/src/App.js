import React, { useState, useEffect } from 'react';
import './App.css';
// Import the init function and the add function from our WASM package
// Changed 'init' to be a named import
import { init, add } from 'rust_backend'; // 'rust_backend' is the name in rust_backend/pkg/package.json

function App() {
  const [sum, setSum] = useState(0);

  useEffect(() => {
    // Initialize the WASM module
    init().then(() => {
      // Call the 'add' function from WASM
      const result = add(2, 3);
      setSum(result);
      console.log('WASM module initialized and add(2, 3) called. Result:', result);
    }).catch(err => {
      console.error("Error initializing WASM module:", err);
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <p>
          React App with Rust + WASM
        </p>
        <p>
          The sum of 2 + 3 (calculated by WASM) is: {sum}
        </p>
      </header>
    </div>
  );
}

export default App;
