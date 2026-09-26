import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, username, key } = await req.json();

    if (!prompt || !username || !key) {
      return NextResponse.json({ error: 'Missing prompt, username, or key' }, { status: 400 });
    }

    const kernelSlug = `${username}/genvoice-story-api`;

    // Create the notebook payload
    const notebookContent = {
      cells: [
        {
          cell_type: "code",
          execution_count: null,
          metadata: {},
          source: [
            "!pip install kaggle-benchmarks -q\n",
            "import kaggle_benchmarks as kbench\n",
            "\n",
            `PROMPT = """${prompt.replace(/"/g, '\\"')}"""\n`,
            "\n",
            "@kbench.task(name=\"genvoice-story-gen\")\n",
            "def generate(llm):\n",
            "    response = llm.prompt(PROMPT)\n",
            "    print(\"\\n---STORY_START---\")\n",
            "    print(response)\n",
            "    print(\"---STORY_END---\\n\")\n",
            "\n",
            "generate.run(kbench.llm)\n"
          ]
        }
      ],
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3"
        },
        language_info: {
          codemirror_mode: {
            name: "ipython",
            version: 3
          },
          file_extension: ".py",
          mimetype: "text/x-python",
          name: "python",
          nbconvert_exporter: "python",
          pygments_lexer: "ipython3",
          version: "3.10.12"
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    const metadata = {
      id: kernelSlug,
      title: "genvoice-story-api",
      code_file: "__notebook__.ipynb",
      language: "python",
      kernel_type: "notebook",
      is_private: true,
      enable_gpu: false,
      enable_internet: true
    };

    // 1. Push Kernel
    const pushFormData = new FormData();
    const nbBlob = new Blob([JSON.stringify(notebookContent)], { type: 'application/json' });
    const metaBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    pushFormData.append('file', nbBlob, '__notebook__.ipynb');
    pushFormData.append('metadata', metaBlob, 'kernel-metadata.json');

    const auth = Buffer.from(`${username}:${key}`).toString('base64');

    const pushRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`
      },
      body: pushFormData
    });

    if (!pushRes.ok) {
      const text = await pushRes.text();
      throw new Error(`Failed to push story kernel: ${pushRes.status} ${text}`);
    }

    const pushData = await pushRes.json();
    return NextResponse.json({ success: true, kernel: kernelSlug, run: pushData });

  } catch (error: any) {
    console.error("Story Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
