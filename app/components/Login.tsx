// components/LoginForm.js
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  toggleView: () => void; // or: React.Dispatch<React.SetStateAction<boolean>>
}

export default function LoginForm({ toggleView }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [show, setShow] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (!auth) throw new Error("Firebase auth is not initialized");
      await signInWithEmailAndPassword(auth, email, password);
      
      console.log("Logged in successfully!");
      router.push("/upload"); // Redirect on success
      
    } catch (err: unknown) {
     const message = err instanceof Error ? err.message : String(err);
      console.error("Login failed:", message);
      alert(`Login failed: ${message}`);
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md"
    >
      <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
        Login
      </h2>

      <div className="mb-4">
        <label className="block text-gray-700 font-medium mb-1">Email</label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your username"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-medium mb-1">Password</label>

        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            {show ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
      </div>


      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
      >
        Login
      </button>

      <p className="text-center mt-4 text-gray-600">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={toggleView}
          className="text-blue-600 hover:text-blue-800 font-semibold"
        >
          Register
        </button>
      </p>
    </form>
  );
}