import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password, kaggleUsername, kaggleKey } = await req.json();

    let username = kaggleUsername ? kaggleUsername.trim() : null;
    let token = kaggleKey ? kaggleKey.trim() : null;
    let slug = 'genvoice-api';

    if (username && token) {
      // Custom credentials, no app password required
    } else {
      if (password !== (process.env.APP_PASSWORD || 'secret')) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      username = process.env.KAGGLE_USERNAME || null;
      token = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null; 
      slug = process.env.KAGGLE_KERNEL_SLUG || 'genvoice-api';
    }

    if (!username || !token) {
      return NextResponse.json({ error: 'Kaggle credentials not provided or configured.' }, { status: 500 });
    }

    // A minimal dummy notebook to quickly complete and kill the previous running kernel session
    const dummyNotebook = {
      "metadata": {
        "kernelspec": {
          "display_name": "Python 3",
          "language": "python",
          "name": "python3"
        },
        "language_info": {
          "name": "python"
        },
        "kaggle": {
          "accelerator": "nvidiaTeslaT4",
          "dataSources": [],
          "isInternetEnabled": true,
          "language": "python",
          "sourceType": "notebook",
          "isGpuEnabled": true
        }
      },
      "nbformat_minor": 4,
      "nbformat": 4,
      "cells": [
        {
          "cell_type": "code",
          "source": "print('Cancelled')",
          "metadata": {},
          "execution_count": null,
          "outputs": []
        }
      ]
    };

    const cleanUsername = username.trim();
    const cleanToken = token.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const payload = {
      slug: `${cleanUsername}/${slug}`,
      newTitle: slug,
      text: JSON.stringify(dummyNotebook),
      language: "python",
      kernelType: "notebook",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: []
    };

    const kaggleRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!kaggleRes.ok) {
      const errText = await kaggleRes.text();
      console.error("[STOP API] Kaggle Error:", errText);
      return NextResponse.json({ error: `Kaggle API Error: ${kaggleRes.status} ${kaggleRes.statusText}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[STOP API] Exception:", err);
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}
