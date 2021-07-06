module.exports = function header(allowedMethods, contentType) {
    let header = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Max-Age': 2592000
    };
    
    if (allowedMethods) header['Access-Control-Allow-Methods'] = allowedMethods;
    if (contentType) header['content-type'] = contentType;
    
    return header;
}