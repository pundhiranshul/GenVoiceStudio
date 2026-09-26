async function run() {
  const res = await fetch("https://www.kaggle.com/api/v1/kernels.KernelsApiService/ListKernelSessionOutput", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName: "pundhiranshul", kernelSlug: "genvoice-api", pageSize: 500 })
  });
  console.log(res.status);
  const text = await res.text();
  console.log(text.substring(0, 500));
}
run();
