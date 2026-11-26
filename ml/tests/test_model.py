"""Verifica forma, lateralidade e equivalência na exportação."""

from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase

import numpy as np
import torch

from dataset import Clip
from evaluate import create_session, run_inference
from model import ARCHITECTURES, ConvSequenceFlexion, ConvSequenceGated, ConvSequenceGeometry, ConvSequenceMotion
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
        inputs = np.random.default_rng(7391).normal(size=(24, 192)).astype(np.float32)
        inputs[:, 3::4] = 1
        row = Clip(0, 1, 1, "test", "fixture", "cinco", "ready", inputs, [])
        for architecture in ARCHITECTURES.values():
            with self.subTest(architecture=architecture.__name__), TemporaryDirectory() as directory:
                model = architecture(4).eval()
                session, _ = create_session(export(model, Path(directory)))
                outputs, maximum, latencies = run_inference([row], model, session, .5)
                self.assertEqual(outputs[0].shape, (4,))
                self.assertLess(maximum, 1e-5)
                self.assertEqual(len(latencies), 1)

    def test_gate_controls_total_probability_of_catalog(self):
        model = ConvSequenceGated(5).eval()
        head = model.classify[-1]
        with torch.no_grad():
            head.weight.zero_()
            head.bias.copy_(torch.tensor([-2., 1., 2., 3., 4.]))
            probabilities = model(torch.zeros(1, 24, 192)).exp()[0]
            head.bias[1:].mul_(3)
            sharper = model(torch.zeros(1, 24, 192)).exp()[0]
        known = torch.sigmoid(torch.tensor(-2.0))
        for result in (probabilities, sharper):
            torch.testing.assert_close(result[0], 1 - known)
            torch.testing.assert_close(result[1:].sum(), known)
        self.assertGreater(sharper[-1], probabilities[-1])

    def test_hand_geometry_is_local_and_requires_wrist_and_palm(self):
        video = torch.zeros((1, 24, 48, 4))
        video[..., 6:27, 0] = torch.arange(21, dtype=torch.float32) / 10
        video[..., 6:27, 3] = 1
        original = ConvSequenceGeometry.local_hand_features(video.flatten(start_dim=2))
        moved = video.clone()
        moved[..., 6:27, :3] = video[..., 6:27, :3] * 1.5 + 2
        torch.testing.assert_close(original, ConvSequenceGeometry.local_hand_features(moved.flatten(start_dim=2)))
        self.assertEqual(original[..., 84:].count_nonzero().item(), 0)
        for index in (6, 15):
            missing_reference = video.clone()
            missing_reference[..., index, 3] = 0
            masked = ConvSequenceGeometry.local_hand_features(missing_reference.flatten(start_dim=2))
            self.assertEqual(masked.count_nonzero().item(), 0)

    def test_flexion_tracks_turns_and_masks_a_missing_joint(self):
        model = ConvSequenceFlexion(5)
        video = torch.zeros(1, 24, 48, 4)
        video[..., 6:11, :] = torch.tensor([
            [0., 0., 0., 1.], [.1, 0., 0., 1.], [.1, .1, 0., 1.],
            [.1, .2, 0., 1.], [.1, .3, 0., 1.],
        ])
        source = model.finger_flexion(video.flatten(start_dim=2))
        torch.testing.assert_close(source[0, 0, :6], torch.tensor([0., 1., 1., 1., 1., 1.]))
        moved = video.clone()
        moved[..., :3] = video[..., [1, 0, 2]] * 2 + 1
        torch.testing.assert_close(source, model.finger_flexion(moved.flatten(start_dim=2)))
        video[..., 8, 3] = 0
        masked = model.finger_flexion(video.flatten(start_dim=2))
        self.assertEqual(masked.count_nonzero().item(), 0)

    def test_motion_uses_adjacent_points_and_masks_occlusion(self):
        video = torch.zeros(1, 24, 48, 4)
        video[..., 6, :] = torch.tensor([0., 0., 0., 1.])
        video[..., 11, :] = torch.tensor([.2, 0., 0., 1.])
        video[..., 23, :] = torch.tensor([0., .2, 0., 1.])
        video[..., 14, :] = torch.tensor([.4, 0., 0., 1.])
        video[:, 1:, 14, 1] = -.2
        video[:, 2, 14, 3] = 0.
        measured = ConvSequenceMotion.hand_motion(video.flatten(start_dim=2))
        self.assertEqual(measured.shape, (1, 24, 32))
        torch.testing.assert_close(measured[0, 0, :4], torch.tensor([0., 0., 1., 1.]))
        self.assertEqual(measured[0, 0, 4:].count_nonzero().item(), 0)
        torch.testing.assert_close(measured[0, 1, 8:12], torch.tensor([0., -.2, 0., 1.]))
        self.assertEqual(measured[0, 2:4, 8:12].count_nonzero().item(), 0)
        self.assertEqual(measured[..., 16:].count_nonzero().item(), 0)
