
const token = '90MRioho0tAMZRuEuUAkpKXOieFDGldO';
const ref = 'nfse_1769367555085_s757h1v19';
const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');

async function test() {
    console.log('Testing JSON endpoint (Homologacao)...');
    const resJson = await fetch(`https://homologacao.focusnfe.com.br/v2/nfse/${ref}`, {
        headers: { 'Authorization': authHeader }
    });

    console.log('JSON Status:', resJson.status);
    console.log('JSON Body:', await resJson.text());

    const pdfUrl = 'https://focusnfe.s3.sa-east-1.amazonaws.com/arquivos/50473338000139_178325/202601/DANFSEs/NFS42187072250473338000139000000000000126010610366925.pdf';
    console.log('Testing PDF S3 URL...');
    const resPdf = await fetch(pdfUrl);
    console.log('PDF Status:', resPdf.status);
    console.log('PDF Content-Type:', resPdf.headers.get('content-type'));


}

test();
