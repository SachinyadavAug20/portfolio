const ShowCaseSection = () => {
  return (
    <div id="work" className="app-showcase">
      <div className="w-full">
        <div className="showcaselayout">
          <div id="work-left" className="first-project-wrapper">
            <div className="image-wrapper">
              <img src="/images/project1.png" alt="baseCase" />
            </div>

            <div className="text-content">
              <h2 className="text-xl font-bold md:text-3xl mb-4 text-white">
                A full-stack Q&A platform featuring rich MDX support,
                algorithmic recommendations, and a dynamic badge system.
              </h2>

              <div className="space-y-4">
                <p className="text-white-50 md:text-lg">
                  Designed for clear technical discussions, the responsive UI
                  empowers users to write complex code snippets and detailed
                  answers effortlessly using full MDX support.
                </p>

                <p className="text-white-50 md:text-lg">
                  A custom gamification engine tracks views and votes to award
                  criteria-based badges. Simultaneously, an algorithmic
                  recommendation system surfaces relevant questions based on a
                  user's past activity.
                </p>

                <p className="text-white-50 md:text-lg">
                  The backend is secured by GitHub/Google OAuth and strict Zod
                  validation, all powered by an optimized, relational MongoDB
                  schema built for efficient querying.
                </p>
              </div>
            </div>
          </div>
          <div id="work-right">
            <div className="project-list-wrapper overflow-hidden">
              <div className="project">
                <div className="image-wrapper">
                  <img src="/images/project2.png" alt="Meow mega corp bank" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowCaseSection;
