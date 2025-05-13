// src/pages/PrivacyPolicy.tsx
import React from "react";
import contact_us from '../assets/contact_us.png';
import Logo from '../assets/logo.png';
import { Link } from "react-router-dom";

const PrivacyPolicy: React.FC = () => {
  return (

    <div className="flex flex-col justify-center items-center max-w-3xl mx-auto">
    <Link to="/" ><img src={Logo} 
    alt="Logo" 
    className="w-40 h-[137px] sm:w-52 sm:h-[179px] md:w-48 md:h-[165px] lg:w-56 lg:h-[193px] xl:w-45 xl:h-[155px]"  />
</Link>
    <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Privacy & Cookie Policy</h1>
      <p className="mb-6 text-sm text-gray-500">Last updated: May 13, 2025</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
        <p>
          Broken Chat is an anonymous and simple chat platform designed to help people connect and talk, quickly and safely. 
          We respect your privacy and are committed to protecting your personal data.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">2. What Data We Collect</h2>
        <p>
          We do <strong>not collect any personally identifiable information</strong> (PII).
        </p>
        <ul className="list-disc list-inside mt-2">
          <li>No registration or accounts required</li>
          <li>Your IP address may be logged temporarily for security</li>
          <li>Chat messages are processed only to deliver messages</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. Cookies and Tracking</h2>
        <p>
          We do <strong>not use tracking cookies</strong> or third-party profiling tools.
        </p>
        <ul className="list-disc list-inside mt-2">
          <li>Only essential local storage may be used (e.g., chat session or preferences)</li>
          <li>No Google Analytics, no ads, no third-party cookies</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">4. Third-Party Services</h2>
        <p>
          We do not use third-party analytics or embeds that collect personal data.
          If that ever changes, this policy will be updated.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">5. Security</h2>
        <p>
          All communication is encrypted via HTTPS. We take reasonable steps to ensure your use of the platform is secure.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">6. Your Rights (EU Users)</h2>
        <p>
          Under GDPR, you have the right to access or delete your data. Since we don’t store personal data, there’s nothing to process — but feel free to contact us with any concerns.
        </p>
      </section>

      <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">7. Contact</h2>
            <p>
                For any privacy-related questions, please contact:
                <br />
                <strong>Email:</strong>{' '}
                <img
                src={contact_us}
                alt="Email contact"
                className="inline-block h-7 align-middle ml-1"
                draggable={false}
                />
            </p>
            </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">8. Changes to This Policy</h2>
        <p>
          This policy may be updated in the future to reflect changes in regulations or technology. 
          The "last updated" date at the top will be revised accordingly.
        </p>
      </section>
    </div>
    </div>
  );
};

export default PrivacyPolicy;
