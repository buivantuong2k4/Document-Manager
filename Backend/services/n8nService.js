const axios = require("axios");

async function sendToN8N(data) {
  return axios.post(process.env.N8N_WEBHOOK_URL1, data);
}

async function sendConfirmToN8N(data) {
  return axios.post(process.env.N8N_WEBHOOK_URL_CONFIRM, data);
}

async function sendConfirmationToN8N(fileMeta) {
  if (!fileMeta) throw new Error("File metadata not found");

  return axios.post(process.env.N8N_WEBHOOK_URL_CONFIRM, {
    fileId: fileMeta.fileId,
    fileName: fileMeta.fileName,
    content: fileMeta.content,

    // DANH SÁCH NGƯỜI KÝ
    signerList: fileMeta.signerList.map(s => ({
      fullName: s.fullName,
      email: s.email,
      signature: s.signature,
      annotations: s.annotations,
      confirmed: s.confirmed === true
    }))
  });
}

module.exports = {
  sendToN8N,
  sendConfirmToN8N,
  sendConfirmationToN8N
};
