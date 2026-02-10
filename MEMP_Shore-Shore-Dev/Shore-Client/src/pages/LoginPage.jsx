// src/pages/LoginPage.jsx
import React from 'react';
import Login from '../components/Login/Login.jsx'; // Corrected path assuming Login.jsx is in src/components/Login/

const LoginPage = () => {
  return (
    <div style={{
      backgroundImage: "url('/Viswadigital.jpg')", // Ensure Viswadigital.jpg is in /public
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Login />
    </div>
  );
};

export default LoginPage;