function checkDocumentError(document) {
  if (!document) {
    return {
      status: 'NOT_FOUND',
      hasError: true,
      message: 'Document does not exist'
    };
  }

  if (document.status === 'ERROR') {
    return {
      status: 'ERROR',
      hasError: true,
      message: document.gdpr_analysis || 'Unknown processing error'
    };
  }

  if (document.status === 'UPLOADING' || document.status === 'PROCESSING'|| document.status === 'PENDING') {
    return {
      status: document.status,
      hasError: false,
      message: 'Document is still being processed'
    };
  }

  return {
    status: 'SUCCESS',
    hasError: false,
    message: 'Document processed successfully',
    classification: document.classification
  };
}

module.exports = { checkDocumentError };
