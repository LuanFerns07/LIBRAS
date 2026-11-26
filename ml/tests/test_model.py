"""Verifica forma, lateralidade e equivalência na exportação."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

import numpy as np
import torch

from dataset import Clip
from evaluate import create_session, run_inference
from model import ConvSequence
from train import augment, export


class ModelTests(TestCase):
    def test_augment_preserves_missing_coordinates_and_mask(self):
        inputs = torch.zeros((4, 24, 192))
        inputs[:, :, 24:28] = torch.tensor([1., 1., 1., 1.])
        result = augment(inputs, torch.Generator().manual_seed(7391)).reshape(4, 24, 48, 4)
        self.assertTrue(bool((result[:, :, :, 3].sum(dim=2) == 1).all()))
        self.assertTrue(bool((result[:, :, :, :3][result[:, :, :, 3] == 0] == 0).all()))
        self.assertEqual(set(torch.nonzero(result[:, 0, :, 3])[:, 1].tolist()), {6, 27})

    def test_export_preserves_outputs_and_decisions(self):
        torch.set_num_threads(1)
        model = ConvSequence(4).eval()
        row = Clip(0, 1, 1, "test", "fixture", "cinco", "ready",
                   np.random.default_rng(7391).normal(size=(24, 192)).astype(np.float32), [])
        with TemporaryDirectory() as directory:
            session, _ = create_session(export(model, Path(directory)))
            outputs, maximum, latencies = run_inference([row], model, session, .5)
        self.assertEqual(outputs[0].shape, (4,))
        self.assertLess(maximum, 1e-5)
        self.assertEqual(len(latencies), 1)
