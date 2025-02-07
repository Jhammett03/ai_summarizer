const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
  
    try {
      // ✅ Use `username` instead of `email` to match the backend
      const response = await axios.post("http://localhost:5000/register", {
        username, // Changed from `email`
        password,
      });
  
      setMessage("Account created! Redirecting to login...");
      setTimeout(() => setShowLogin(true), 2000);
    } catch (err) {
      setMessage(err.response?.data?.error || "Registration failed");
    }
  };
  