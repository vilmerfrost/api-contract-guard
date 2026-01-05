async function testAuth() {
  const username = 'backpack';
  const password = '7065707061727065707061722d9fbf081779c2784af4b38fbd6278c450b4c3cf3c9e623ac79aaf1c24b87ac3f9c1d920f1ad78b89f43e115dafdf9b97cf650fdb74116d0ba2e7de1757773b3c0f38a40f0b4deb4aeacf01289faa21b5cb0613c07b0892ee4f41c2d15cde4f80c5b71e1b7b0dea61407a72ee98913756a71a033ffff2911fb6595c5f4d9c610dbbd03dc933e4fe1a8d51fd36884179bf83cac60493fac395a25e776432dcc6e';
  
  console.log('Password length:', password.length);
  
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', username);
  params.append('password', password);
  
  const tokenUrl = 'https://pdq.swedencentral.cloudapp.azure.com/dev/app/token';
  
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
}

testAuth();
