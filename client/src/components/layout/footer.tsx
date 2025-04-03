import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
        <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
          <div className="px-5 py-2">
            <Link href="/about">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                About
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/privacy">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Privacy Policy
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/terms">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Terms of Service
              </span>
            </Link>
          </div>
          <div className="px-5 py-2">
            <Link href="/contact">
              <span className="text-base text-gray-500 hover:text-gray-900 cursor-pointer">
                Contact
              </span>
            </Link>
          </div>
        </nav>
        <p className="mt-4 text-center text-base text-gray-400">
          &copy; {new Date().getFullYear()} ImageShare. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
