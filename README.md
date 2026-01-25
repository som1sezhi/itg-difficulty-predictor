# ITG Difficulty Predictor

An attempt at creating a machine-learning model that assigns ratings to In the Groove charts using only density information (so patterns, tech, etc. are not taken into account).

You can use some of the models through [the web app](https://som1sezhi.github.io/itg-difficulty-predictor/). Remember that these models are not completely accurate, especially when the chart contains tech, so be wary when using this tool to rate your charts.

- `notebooks/` contains all the Jupyter notebooks I used to experiment with various models, as well as CSV files containing the training data I compiled. Warning: very disorganized and undocumented.
- `app/itg-difficulty-predictor-app/` contains the code for the web app, including client-side implementations of a couple of models.