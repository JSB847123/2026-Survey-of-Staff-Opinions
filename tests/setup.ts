import "dotenv/config";

// 테스트용 세션 시크릿 (실제 값과 무관한 테스트 전용 더미)
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef";
}
