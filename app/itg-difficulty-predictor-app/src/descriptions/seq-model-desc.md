## About this model

This tool predicts the difficulty rating of an ITG chart using an incredibly ad-hoc model based on the density of the chart over time. The steps this model takes are:

1. Build a density sequence (a list of NPS values for every 1-second interval of the chart)
2. Reduce this sequence down into a single number $S$ (the "difficulty score") that increases roughly linearly with difficulty (more explanation later)
3. Feed $S$ through a series of logistic regression models that each classify whether the rating ≥ [some value] for the given value of $S$
4. Calculate the final predicted rating as a weighted average of the ratings (weighted by probability), plus 0.5 (to shift the scale so that e.g. the "15" range is between 15.0-15.9 instead of 14.5-15.4)

This model does a bit worse than the simple 3-feature model in terms of raw numbers/statistics; it has about 70% accuracy on the training set, with a ~0.4 MAE in block rating. (I'm lazy so I didn't bother doing a train/test split.) I like this model better than the simple model though, since it works on a wider variety of charts, not just stamina/16ths stream. I also gave this model the ability to extrapolate to ratings higher than 43, so that's cool I guess.

### "Difficulty score" calculation

Let $\{d_i\}_{i=1}^N$ be a sequence of NPS density values for the chart. The "difficulty score" $S$ is calculated as follows:

$$
S = \ln\left(1 + \sum_{i=1}^{N} \left( a^{\left(1 + 0.01 e_{i}\right) d_{i}} - 1 \right)\right)
$$

where
- $a = 2.387$ is a model parameter determined via training
- $e_{i}$ is the *exhaustion factor* at time $i$ into the chart

This is based on the rough notion in stamina where the difficulty rating increases linearly with density and logarithmically with length. Notice how in the above equation, the logarithm and exponentiation cancel out such that with all else equal, $S$ is linearly proportional to the density. Additionally, if you set all the $d_i$'s to a constant value and then increase $N$, the summation will grow linearly and so $S$ will grow logarithmically, as desired.

The exhaustion factor $e_{i}$ is intended to quantify the exhaustion felt by the player at time $i$. The calculation of this factor is probably the most hacked-together ad-hoc thing in this model.

$$
e_i = m_i + C_o o_i
$$

where
- $m_i$ is the *momentary exhaustion* at time $i$, which increases during high-density runs and decreases during breaks
- $C_o = 0.004047$ ("overall exhaustion coefficient") is a model parameter determined via training
- $o_i = \ln\left(1+\sum_{j=1}^i d_j\right)$ is the *overall exhaustion* at time $i$, meant to quantify exhaustion that doesn't go away during breaks

$m_i$, in turn, is calculated via a recurrence relation:

$$
\begin{align*}
m_1 &= 0 \\
m_{i+1} &= \begin{cases}
  m_i \cdot C_r \left(1 - 0.57(1-C_r) \frac{d_i}{CP}\right) &\text{if } d_i \le CP \\
  m_i + e^{-m_i/C_e} \cdot (d_i - CP) &\text{if } d_i \gt CP
\end{cases}
\end{align*}
$$

where
- $CP = 7.309$ ("critical power")
- $C_r = 0.9702$ ("recovery coefficient")
- $C_e = 4.66$ ("exhaustion coefficient")

are all model parameters determined during training.

The math here is a bit of a mess, but the main idea is that above a certain density threshold $CP$, $m_i$ increases logarithmically over time to indicate exhaustion, and below the threshold, $m_i$ decays exponentially over time to indicate recovery. $m_i$ increases/decreases faster or slower based on how much greater or lesser $d_i$ is than $CP$.

This exhaustion model is inspired by the models in [this article I found](https://sportsmedicine-open.springeropen.com/articles/10.1186/s40798-019-0230-z), which seems to suggest that there exists a power output that a person can sustain more-or-less indefinitely (the *critical power*), and that workouts above your critical power exhaust your anaerobic reserves (causing you to tire out and stop) and workouts below your critical power allow you to recover. I ended up not following their mathematical models very closely, for multiple reasons:
- ITG players can have wildly varying critical power levels; a beginner might get gassed by 32 measures @ 100 BPM, while a more experienced player could probably do 100 BPM for hours, willpower notwithstanding. I couldn't come up with a good way of taking into account all potential values of a player's critical power and reducing that down to one number.
- Their models don't take into account the fact that training at critical power *will* tire you out after an hour or so.
- Their models are mainly developed to help calculate a person's critical power based on time to exhaustion and stuff like that. I couldn't figure out a way to adapt those models to a domain where the power output over time is already predetermined and the desired value to calculate is the difficulty of completing such a workout.

I ended up just letting the model's training process decide on a fixed $CP$ value, and taking a wild guess at how the exhaustion factor would mathematically increase/decrease during exhaustion/recovery periods.

### Predicated rating calculation

After $S$ is calculated, it is fed into a series of logistic regressions that each perform a binary classification based on whether, for the given $S$, the final chart rating should be greater than some value $r$. There are 35 classifiers used by this model, one for each of $r = 1, 2, ..., 35$. (I actually fit classifiers all the way up to $r = 42$, but those are a little less reliable due to the lack of data points above the thresholds for those classifiers.) Since these classifiers give probabilities for each class, we can then use those values to derive probabilities for each individual rating value, which we can then use as weights in a weighted average to calculate a final predicted rating.

As it turns out, the logistic thresholds for the upper range of difficulties are quite evenly distributed. This means we could construct our own synthetic binary classifiers for $r \ge 36$ by linearly extrapolating the logistic thresholds, and then we can use those synthetic classifiers to rate charts 36 and beyond. For example, apparently 256 measures @ 500 BPM is a mid 47. Does that sound right? IDK probably.

### Training

I used the following packs to train this model:
- SRPG6/7/8/9 base packs (excluding DPRT)
- ECS11/12/13 (including marathons)
- SRPG6 New Number Pack unlocks
- a portion of SRPG9 unlocks that I happened to have on my computer
- CERiSTREAMS
- gamblecore
- kpoop
- pack.dat.3
- Really Long Stuff
- The Starter Pack of Stamina 2
- various Yuzu fof packs
- a smattering of various super-long marathon charts

The training process is basically just a black-box global optimizer (specifically `scipy.optimize.direct`) minimizing a function that calculates $S$ for all charts in the training data, uses those scores to train the binary classifiers, then returns the resulting MAE for the training data. The idea here was that a better model should give a better "separation" between classes for the binary classifiers, which would somehow be reflected in a lower MAE? I have no idea how sound this training process is, to be quite honest.

Originally, the binary classifiers were a full-on ordinal regession layer, but fitting those to the data turned out to take a really long time, so I switched to a bunch of independent classifiers instead. There wasn't really much danger of the logistic thresholds becoming out of order anyway.

### Limitations/problems I found

- Patterns don't affect difficulty predictions
- This model seems to underrate super long hard stuff. For example, it gives [21] XS Project Collection Full a rating of 18.51.
- Probably some other stuff IDK I'm not an ML guy