// components/RegisterForm.js
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

interface RegisterFormProps {
    toggleView: () => void; // or: React.Dispatch<React.SetStateAction<boolean>>
}

export default function RegisterForm({ toggleView }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      
      console.log("User registered and logged in successfully!");
      router.push("/upload"); // Redirect on success

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("Registration failed:", message);
        alert(`Registration failed: ${message}`);
    }
  };

  return (
    <form
      onSubmit={handleRegister}
      className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md"
    >
      <h2 className="text-3xl font-bold text-center text-indigo-700 mb-6">
        Register
      </h2>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Must be 6+ characters"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
      >
        Sign Up
      </button>

      <p className="text-center mt-4 text-gray-600">
        Already have an account?{" "}
        <button
          type="button"
          onClick={toggleView}
          className="text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          Login
        </button>
      </p>
    </form>
  );
}