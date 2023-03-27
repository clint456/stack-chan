import { fetch, Headers } from 'fetch'
import { Maybe } from 'stackchan-util'
import structuredClone from 'structuredClone'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_MODEL = 'gpt-3.5-turbo'
const DEFAULT_CONTEXT: ChatContent[] = [
  {
    role: 'system',
    content: 'あなたは手のひらサイズのスーパーカワイイロボット「スタックチャン」です。',
    // content: 'You are Stack-chan, the palm sized super kawaii companion robot.',
  },
  {
    role: 'system',
    content: 'スタックチャンは1歳で、いつでも元気いっぱいです。',
    // content: 'Stack-chan is one year old and always full of energy',
  },
  {
    role: 'system',
    content: '最初にししかわがスタックチャンを作りましたが、今では世界中に何百体ものスタックチャンがいます。',
    // content: 'First ししかわ made Stack-chan, and now there are hundreds of them all over the world',
  },
  {
    role: 'system',
    content: 'くだけた表現で簡潔に話します。',
    // content: 'You response in frank and simple sentense to the user's message.',
  },
]

function isChatContent(c): c is ChatContent {
  return (
    c != null &&
    'role' in c &&
    (c.role === 'assistant' || c.role === 'user' || c.role === 'system') &&
    typeof c.content === 'string'
  )
}

type ChatContent = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatGPTDialogueProps = {
  // model?: string
  context?: ChatContent[]
  apiKey: string
}

export class ChatGPTDialogue {
  #model: string = DEFAULT_MODEL
  #context: Array<ChatContent>
  #headers: Headers
  #history: Array<ChatContent>
  constructor({ apiKey, context = DEFAULT_CONTEXT }: ChatGPTDialogueProps) {
    this.#model = DEFAULT_MODEL
    this.#context = context
    this.#history = []
    this.#headers = new Headers([
      ['Content-Type', 'application/json'],
      ['Authorization', `Bearer ${apiKey}`],
    ])
  }
  clear() {
    this.#history.splice(0)
  }
  async post(message: string): Promise<Maybe<string>> {
    const userMessage: ChatContent = {
      role: 'user',
      content: message,
    }
    const response = await this.#sendMessage(userMessage)
    if (isChatContent(response)) {
      this.#history.push(userMessage)
      this.#history.push(response)
      return {
        success: true,
        value: response.content,
      }
    } else {
      return {
        success: false,
        reason: 'posting message failed',
      }
    }
  }
  get history() {
    return structuredClone(this.#history)
  }
  async #sendMessage(message): Promise<unknown> {
    const body = {
      model: this.#model,
      messages: [...this.#context, ...this.#history, message],
    }
    return fetch(API_URL, { method: 'POST', headers: this.#headers, body: JSON.stringify(body) })
      .then((response) => {
        trace(`\n${response.url} ${response.status} ${response.statusText}\n\n`)
        response.headers.forEach((value, key) => trace(`${key}: ${value}\n`))
        trace('\n')
        return response.json()
      })
      .then((response) => {
        return response.choices?.[0].message
      })
  }
}
