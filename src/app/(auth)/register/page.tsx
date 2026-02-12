'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', username: '', displayName: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Registration failed');
        return;
      }
      router.push('/lobby');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
    { key: 'username', label: 'Username', type: 'text', placeholder: 'pokerpro99' },
    { key: 'displayName', label: 'Display Name', type: 'text', placeholder: 'Your Name' },
    { key: 'password', label: 'Password', type: 'password', placeholder: '6+ characters' },
    { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">♠ Poker</h1>
          <p className="text-gray-500 mt-2">Create your account</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-6">Sign Up</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-800 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  value={form[f.key as keyof typeof form]}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={f.placeholder}
                  required
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
