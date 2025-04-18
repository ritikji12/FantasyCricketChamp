import React from 'react';
import AvatarLogo from './ui/avatar-logo';

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <AvatarLogo size="sm" className="mr-3" />
            <h2 className="font-montserrat font-bold text-xl">
              <span className="text-[#2ABDC0]">CR13K3</span>
              <span className="text-[#FF0066]">T FC</span>
            </h2>
          </div>
          <div className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Cricket Fantasy League. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
