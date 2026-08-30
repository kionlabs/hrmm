import type { NextConfig } from "next";
import os from "os";

// 로컬 PC의 네트워크 인터페이스에서 IPv4 주소 및 터널링 와일드카드를 동적으로 감지하는 헬퍼 함수
const getLocalDevOrigins = (): string[] => {
  const origins: string[] = [
    "localhost", 
    "localhost:3000", 
    "127.0.0.1",
    "*.loca.lt",                // localtunnel 실제 도메인 대비
    "*.localtunnel.me",          // localtunnel 서브 대비
    "*.pinggy.link",            // pinggy 대비
    "*.ngrok-free.app",         // ngrok 최신 대비
    "*.ngrok.io",               // ngrok 구버전 대비
    "*.vsportal.visualstudio.com" // VS Code 포트 포워딩 대비
  ];
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name] || [];
    for (const net of netList) {
      if (net.family === "IPv4" && !net.internal) {
        origins.push(net.address);
        origins.push(`${net.address}:3000`);
        origins.push(`${net.address}:3001`);
        origins.push(`${net.address}:3002`);
      }
    }
  }
  return origins;
};

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
};

export default nextConfig;
