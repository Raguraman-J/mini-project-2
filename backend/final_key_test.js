const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'YOUR_API_KEY' });

async function test() {
    try {
        const response = await groq.chat.completions.create({
            messages: [{ role: "user", content: "hi" }],
            model: "llama3-8b-8192",
        });
        console.log('Success:', response.choices[0].message.content);
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}
test();
