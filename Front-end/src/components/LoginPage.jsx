import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

function LoginPage({ onLoginSuccess }) {
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      console.log("Google Token:", credentialResponse.credential);

      // Gửi token xuống Backend để kiểm tra
      const res = await axios.post("http://localhost:5000/api/auth/google", {
        token: credentialResponse.credential,
      });

      // Nếu thành công -> Lưu vào localStorage
      console.log("Login Success:", res.data);

      // 💾 Lưu user và token vào localStorage
      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("token", res.data.token || "");
      }

      onLoginSuccess(res.data); // res.data chứa { token, user }
    } catch (error) {
      console.error("Login Failed:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Đăng nhập thất bại!");
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ color: "#24292e" }}>🔐 Nội bộ doanh nghiệp</h1>
        <p style={{ color: "#666", marginBottom: "30px" }}>
          Vui lòng sử dụng Email công ty để đăng nhập
        </p>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.log("Login Failed");
              alert("Không thể kết nối tới Google");
            }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Styles ---
const containerStyle = {
  height: "100vh",
  width: "100vw",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#f0f2f5",
  backgroundImage: "radial-gradient(#e1e4e8 1px, transparent 1px)",
  backgroundSize: "20px 20px",
};

const cardStyle = {
  background: "white",
  padding: "40px 60px",
  borderRadius: "10px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
  textAlign: "center",
};

export default LoginPage;
