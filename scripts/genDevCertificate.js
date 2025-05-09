import selfsigned from 'selfsigned';
import fs from 'fs';

var attrs = [{ name: 'commonName', value: 'example.com' }];
var pems = selfsigned.generate(attrs, { days: 365 });
if (!fs.existsSync('cert')) {
    fs.mkdirSync('cert');
}
fs.writeFileSync('cert/cert.pem', pems.cert);
fs.writeFileSync('cert/key.pem', pems.private);
console.log('Certificates generated successfully');