const Groq = require("groq-sdk");
<<<<<<< HEAD
const groq = new Groq({ apiKey: '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' });
=======
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'YOUR_API_KEY' });
>>>>>>> 3c1dbb945794e8b8f8fba06d1ff9d2e48d763936

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
