import React from "react";
import { Link } from "react-router-dom";
import contact_us from '../assets/contact_us.png';
import Logo from "../assets/logo.png";

const TermsOfUse: React.FC = () => {
  return (
    <div className="flex flex-col justify-center items-center max-w-3xl mx-auto">
      <Link to="/">
        <img 
          src={Logo} 
          alt="Logo" 
          className="w-32 sm:w-40 md:w-44 lg:w-48 xl:w-[170px] h-auto" 
        />
      </Link>

      <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
        <h1 className="text-3xl font-bold mb-6 text-center">Terms of Use</h1>
        <p className="mb-1 text-sm text-gray-500 text-center">Created: May 5, 2025</p>
        <p className="mb-6 text-sm text-gray-500 text-center">Last updated: May 13, 2025</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">1. Access to the Service</h2>
          <p className="text-left">
            Use of Broken Chat is strictly limited to users who are 18 years of age or older. By accessing the platform, you confirm that you are at least 18 years old.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">2. Prohibited Content</h2>
          <ul className="list-disc pl-6 text-left space-y-2">
            <li>Any material involving minors (including images, videos, or text)</li>
            <li>Non-consensual adult content</li>
            <li>Threats, harassment, or content inciting hatred or violence</li>
            <li>Spam, fraud, phishing, or impersonation</li>
            <li>Any content that violates applicable laws or third-party rights</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">3. User Responsibility</h2>
          <p className="text-left">
            Users are fully responsible for the content they share. Violations may result in immediate bans and, in severe cases, reporting to the appropriate authorities.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">4. Moderation and Removal</h2>
          <p className="text-left">
            Broken Chat reserves the right to remove any inappropriate content and suspend or block users who violate these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">5. Limitation of Liability</h2>
          <p className="text-left">
            Broken Chat is not liable for any content shared by users. However, we cooperate with authorities in the event of serious violations.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2 text-center">6. Changes to the Terms</h2>
          <p className="text-left">
            These Terms of Use may be updated at any time. Users are encouraged to review them regularly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2 text-center">7. Contact</h2>
          <p className="text-left">
            For any questions, please contact:
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
      </div>
    </div>
  );
};

export default TermsOfUse;
