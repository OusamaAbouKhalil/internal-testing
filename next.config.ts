import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['firebase-admin'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark firebase-admin and @google-cloud packages as external for server bundles
      config.externals = config.externals || [];
      config.externals.push({
        'firebase-admin': 'commonjs firebase-admin',
        'firebase-admin/app': 'commonjs firebase-admin/app',
        'firebase-admin/firestore': 'commonjs firebase-admin/firestore',
        '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
      });
    }
    return config;
  },
};

export default nextConfig;
