export default function logging (description = '', payload = '', timestamp = new Date().getTime().toString()) {
    console.log(`[${timestamp}] ${description}`, payload);
}

export function logError (description = '', payload = '', timestamp = new Date().getTime().toString()) {
    console.error(`[${timestamp}] ERROR: ${description}`, payload);
}
