# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container at /app
# This includes main.py, backend/, static/, and templates/
COPY . .

# Make port 8001 available to the world outside this container
EXPOSE 8001

# Define environment variable for Uvicorn
ENV PYTHONUNBUFFERED 1

# Run main.py when the container launches
# Use 0.0.0.0 to make the app accessible from outside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
