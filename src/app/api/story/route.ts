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

    const payload = {
      slug: kernelSlug,
      newTitle: "genvoice-story-api",
      text: JSON.stringify(notebookContent),
      language: "python",
      kernelType: "notebook",
      isPrivate: true,
      enableGpu: false,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: []
    };

    let authHeader = '';
    if (key.length === 32 && /^[0-9a-f]+$/i.test(key)) {
      authHeader = 'Basic ' + Buffer.from(`${username}:${key}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + key;
    }

    const pushRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
