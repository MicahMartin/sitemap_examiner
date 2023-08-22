from locust import HttpUser, task, constant
import requests
import random

# DDoSing your interviewer sounds like a bad idea
# So We only stress test the /search api
# The product API reaches out & scrapes HTML from Christianbook
# So we have to figure out how to mock the data before testing that endpoint
word_site = "https://www.mit.edu/~ecprice/wordlist.10000"
response = requests.get(word_site)
WORDS = response.content.splitlines()

class MyUser(HttpUser):
    wait_time = constant(.5)

    # @task
    # def get_status(self):
    #     self.client.get("/status")

    # @task
    # def get_product(self):
    #     self.client.get("/product/404")

    # @task
    # def search_products(self):
    #     random_word_count = random.randint(1, 3)
    #     random_words = random.sample(WORDS, random_word_count)
    #     query_param = " ".join(word.decode("utf-8") for word in random_words)
    #     self.client.get(f"/search?keywords={query_param}")
