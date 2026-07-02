import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** 瀏覽器端 mock worker，於開發環境攔截 API 請求 */
export const worker = setupWorker(...handlers)
