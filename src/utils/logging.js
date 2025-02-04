export default logging = (description = '', payload	 = '', timestamp =  new Date().getTime().toString()) => {
    console.log(timestamp, '|', description, '|', payload);
}
export const logError = (description = '', payload	 = '', timestamp =  new Date().getTime().toString()) => {
    console.log(timestamp, '|', description, '|', payload);
}
