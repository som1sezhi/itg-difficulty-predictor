## About this model

This tool predicts the rating of an ITG stamina chart using an ordinal regression model (specifically an ordered logit model), deriving a final prediction by taking a weighted average of the ratings (and then adding 0.5 to shift the scale over so that e.g. the "15" range is between 15.0-15.9 instead of 14.5-15.4). This model was trained and evaluated on the following packs:

- SRPG6/7/8/9 base packs (excluding DPRT)
- ECS11/12/13 (including marathons)
- SRPG6 New Number Pack unlocks

During evaluation, this kind of model could predict ratings with about a ~70-79% accuracy rate, rarely being off by more than 1 block (~0.2-0.3 MAE in block rating), which I think is pretty decent given its simplicity and interpretability.

Some caveats:

- This model cannot rate charts lower than 11.5 or higher than 43.5
- This model only uses a few chart features, so it can't take things like patterns, unbroken stream length, break density, etc. into account
- You likely shouldn't trust this model with extrapolating beyond its training data (esp. for very low BPM/stream run/density)
- Probably some other stuff IDK I'm not an ML guy